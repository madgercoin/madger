"""Prepare the approved project audio sources into a restrained game sound bank.
Requires ffmpeg, NumPy, SciPy. Source clips are committed for reproducibility.
"""
import pathlib,subprocess,tempfile,wave,json
import numpy as np
from scipy.signal import butter,sosfilt
ROOT=pathlib.Path(__file__).resolve().parents[1]/'assets/audio/expedition'; RATE=24000

def save(name,x,peak=.38):
    x=np.asarray(x,dtype=float);x-=x.mean();x=sosfilt(butter(2,70,fs=RATE,btype='highpass',output='sos'),x)
    x*=np.minimum(1,np.arange(len(x))/(RATE*.008));x*=np.minimum(1,np.arange(len(x))[::-1]/(RATE*.035));x*=peak/max(.0001,np.max(np.abs(x)))
    with wave.open(str(ROOT/name),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((x*32767).astype('<i2').tobytes())
with tempfile.TemporaryDirectory() as d:
    wav=pathlib.Path(d)/'paws.wav';subprocess.run(['ffmpeg','-v','error','-y','-i',str(ROOT/'source/forest-paws.mp3'),'-ar',str(RATE),'-ac','1',str(wav)],check=True)
    with wave.open(str(wav)) as w:raw=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
    for i,t in enumerate([1.33,2.85,4.49,5.15]):
        x=raw[int((t-.075)*RATE):int((t+.23)*RATE)]
        save(f'paw-{i+1}.wav',sosfilt(butter(2,4200,fs=RATE,output='sos'),x),.42)
        save(f'stone-{i+1}.wav',sosfilt(butter(2,[180,2600],fs=RATE,btype='bandpass',output='sos'),x),.34)
    # Ground contact and a soft brush, without the old pitched jump whistle.
    save('jump.wav',raw[int(4.45*RATE):int(4.66*RATE)],.30)
    save('land.wav',raw[int(1.24*RATE):int(1.65*RATE)],.48)
    save('slide.wav',raw[int(2.77*RATE):int(3.20*RATE)],.34)
# Four short damped metal tinkles. Inharmonic partials avoid a repeated alarm note.
for i,f in enumerate([734,821,653,915]):
    t=np.arange(int(RATE*.24))/RATE
    x=sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t*decay) for a,k,decay in [(.65,1,25),(.22,1.437,32),(.12,2.761,48)])
    save('pickup.wav' if i==0 else f'pickup-{i+1}.wav',x,.26)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(ROOT/'source/forest-air.mp3'),'-af','highpass=f=160,lowpass=f=6500,loudnorm=I=-30:TP=-8:LRA=9','-ar',str(RATE),'-ac','1','-b:a','64k',str(ROOT/'forest-air.mp3')],check=True)
print('Prepared 8 natural contact variants, jump/land/slide, 4 soft pickup variants and quiet ambience')
