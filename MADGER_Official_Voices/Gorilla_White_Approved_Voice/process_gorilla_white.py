#!/usr/bin/env python3
"""Process new Chad speech-to-speech audio using the approved Gorilla White chain.
Usage: python process_gorilla_white.py converted.wav output.wav --segments '[[0.35,1.33],[1.82,3.37]]'
Segments are acoustic speech boundaries in the input; provide them to retain lip timing.
Omit --segments to process the complete recording. Do not pass an already processed master.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['OMP_NUM_THREADS']='1'
from pathlib import Path
import argparse,json,subprocess,re
import numpy as np
from scipy import signal,ndimage
from nara_wpe.wpe import wpe_v7
sr=48000
def run(args,**kw):return subprocess.run(args,check=True,capture_output=True,**kw)
def decode(path,channels=2):
    a=np.frombuffer(run(['ffmpeg','-v','error','-i',str(path),'-ar',str(sr),'-ac',str(channels),'-f','f32le','-']).stdout,dtype='<f4').copy()
    return a.reshape(-1,channels).astype('float64')
def filt(x,af):
    channels=1 if x.ndim==1 else x.shape[1]
    y=np.frombuffer(run(['ffmpeg','-v','error','-f','f32le','-ar',str(sr),'-ac',str(channels),'-i','-','-af',af,'-ar',str(sr),'-f','f32le','-'],input=x.astype('<f4').tobytes()).stdout,dtype='<f4').astype('float64')
    return y if channels==1 else y.reshape(-1,channels)
def rms(x):return float(np.sqrt(np.mean(x*x)+1e-18))
def loudness(x):
    if x.ndim==1:x=np.column_stack([x,x])
    if len(x)<int(.45*sr):x=np.pad(x,((0,int(.45*sr)-len(x)),(0,0)))
    r=run(['ffmpeg','-v','info','-f','f32le','-ar',str(sr),'-ac','2','-i','-','-af','loudnorm=I=-17:TP=-2:LRA=7:print_format=json','-f','null','-'],input=x.astype('<f4').tobytes())
    return float(json.loads(re.findall(r'\{[^{}]+\}',r.stderr.decode())[-1])['input_i'])
def fade(x,ms=8):
    k=min(round(ms/1000*sr),len(x)//2)
    shape=(k,) if x.ndim==1 else (k,1)
    x[:k]*=np.linspace(0,1,k).reshape(shape);x[-k:]*=np.linspace(1,0,k).reshape(shape)
    return x
def normal(x,target=-17):
    before=loudness(x)
    x=x*10**((target-before)/20)
    x=filt(x,'alimiter=limit=0.79:attack=5:release=70:level=false:latency=true')
    return x,{'before_lufs':before,'after_lufs':loudness(x),'gain_db':target-before}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input');parser.add_argument('output');parser.add_argument('--segments')
    args=parser.parse_args()
    raw=decode(args.input,1)[:,0]
    segments=json.loads(args.segments) if args.segments else [[0,len(raw)/sr]]
    for lo,hi in segments:
        if not 0<=lo<hi<=len(raw)/sr+.03:raise ValueError('Speech segment outside source duration')
    _,_,z=signal.stft(raw,fs=sr,nperseg=2048,noverlap=1536,boundary='zeros',padded=True)
    clean=wpe_v7(z[:,None,:],taps=16,delay=3,iterations=5,psd_context=1,statistics_mode='full')[:,0,:]
    _,dry=signal.istft(clean,fs=sr,nperseg=2048,noverlap=1536,boundary=True)
    dry=.95*dry[:len(raw)]+.05*raw
    pitch=1.05*.97*.98*.985*.94*.97
    dry=filt(dry,f'rubberband=tempo=1:pitch={pitch}:pitchq=quality:window=short:smoothing=on,highpass=f=70,equalizer=f=175:t=o:w=1:g=2.0,equalizer=f=350:t=o:w=1:g=-1.5,equalizer=f=2400:t=o:w=1.2:g=2.0,acompressor=threshold=0.12:ratio=2.5:attack=12:release=90:makeup=1:knee=2.8')
    # Suppress only the low tails, with a soft envelope that retains consonants.
    env=np.sqrt(np.maximum(signal.convolve(dry*dry,np.ones(720)/720,mode='same'),1e-12))
    target=np.clip((env/.0178)**.65,.16,1)
    gain=np.empty_like(target);g=1.
    attack=np.exp(-1/(sr*.004));release=np.exp(-1/(sr*.032))
    for i,v in enumerate(target):
        a=attack if v>g else release
        g=a*g+(1-a)*v;gain[i]=g
    dry*=gain
    old=np.zeros((len(raw),2))
    for lo,hi in segments:
        a,b=round(lo*sr),min(len(raw),round(hi*sr))
        v=fade(dry[a:b].copy());v,_=normal(v)
        old[a:a+len(v)]=v[:,None]
    x=old.mean(axis=1)
    _,_,z=signal.stft(x,fs=sr,nperseg=1536,noverlap=1152,boundary='zeros',padded=True)
    clean=wpe_v7(z[:,None,:],taps=40,delay=2,iterations=8,psd_context=1,statistics_mode='full')[:,0,:]
    # Suppress the diffuse, slowly decaying component within syllables, rather
    # than merely muting the spaces between sentences.
    power=np.abs(clean)**2
    smooth=ndimage.uniform_filter1d(power,size=3,axis=0)
    late=np.zeros_like(smooth)
    decay=np.exp(-6.9078*(384/sr)/.20)
    for i in range(2,smooth.shape[1]):late[:,i]=decay*late[:,i-1]+(1-decay)*smooth[:,i-2]
    mask=np.sqrt(np.clip(1-.72*late/(smooth+1e-12),.10,1))
    mask=ndimage.uniform_filter1d(mask,size=3,axis=0)
    _,y=signal.istft(clean*mask,fs=sr,nperseg=1536,noverlap=1152,boundary=True)
    y=np.pad(y[:len(x)],(0,max(0,len(x)-len(y))))
    # Remove excess box resonance and restore consonant definition without
    # adding delay, widening, pitch processing, or artificial room effects.
    y=filt(y,'highpass=f=78,equalizer=f=310:t=o:w=1:g=-2.4,equalizer=f=3400:t=o:w=1:g=1.7')[:len(x)]
    envelope=np.sqrt(np.maximum(signal.convolve(y*y,np.ones(240)/240,mode='same'),1e-14))
    target=np.clip((envelope/.018)**1.1,.035,1)
    gain=np.empty_like(target);g=0.
    attack=np.exp(-1/(sr*.0015));release=np.exp(-1/(sr*.016))
    for i,v in enumerate(target):
     a=attack if v>g else release;g=a*g+(1-a)*v;gain[i]=g
    y*=gain
    new=np.zeros_like(old)
    for lo,hi in segments:
        a,b=round(lo*sr),min(len(raw),round(hi*sr))
        v=y[a:b].copy();v,_=normal(v)
        k=min(round(.004*sr),len(v)//2)
        v[:k]*=np.linspace(0,1,k);v[-k:]*=np.linspace(1,0,k)
        new[a:a+len(v)]=v[:,None]
    output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
    run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(sr),'-ac','2','-i','-','-c:a','pcm_s24le',str(output)],input=new.astype('<f4').tobytes())
    print(str(output))
