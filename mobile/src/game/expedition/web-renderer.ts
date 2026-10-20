import { ExpeditionScene } from './scene';
import type { GL } from './gl';

type SceneFactory = (gl: GL) => Promise<ExpeditionScene>;
declare global { interface Window { madgerOvergrownScene?: SceneFactory; madgerActiveRenderer?: 'pbr'|'fallback' } }
let loading: Promise<void> | null = null;

/** Prefer authored 3D/PBR scenes when shipped. Fall back to our tested WebGL
 * renderer if its separate web module or assets have not deployed yet.
 * A missing optional renderer must not make an otherwise playable run fail.
 */
export async function createWebExpeditionScene(gl: GL): Promise<ExpeditionScene> {
  if (typeof window === 'undefined') return new ExpeditionScene(gl);
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module'; script.src = '/blackroot/renderer.mjs?v=chambers-20261019-3';
    script.onload = () => resolve();
    script.onerror = () => { loading = null; script.remove(); reject(new Error('Optional high-detail renderer not available')); };
    document.head.appendChild(script);
  });
  try {
    await loading;
    if (window.madgerOvergrownScene) { const result=await window.madgerOvergrownScene(gl); window.madgerActiveRenderer='pbr'; return result; }
    console.warn('MADGER_WEB_RENDERER_FALLBACK: high-detail scene not initialized');
  } catch (error) {
    console.warn('MADGER_WEB_RENDERER_FALLBACK',error);
  }
  window.madgerActiveRenderer='fallback';
  return new ExpeditionScene(gl);
}
