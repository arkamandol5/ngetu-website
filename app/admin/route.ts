import {adminHTML} from '../../lib/admin-page';
import {secure} from '../../lib/server';
export const dynamic='force-dynamic';
export async function GET(){return secure(new Response(adminHTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow'}}));}
