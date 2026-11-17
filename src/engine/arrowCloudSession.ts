/** ARRAY cloud history uses the ARROW/Relay account, not RAVIN 1.1's JWT.
 * Session storage is shared only by applications on the same browser origin.
 * No service-role key or password is ever used here.
 */
const RELAY_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
const RELAY_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
const STORAGE_KEY = 'sb-cnorozrjugxpanpfmssa-auth-token';

type AuthUser = { id: string; email?: string };
type AuthSession = { access_token: string; user?: AuthUser };
type AuthResult = { data: { user: AuthUser | null }; error: {message:string}|null };
type SessionResult = { data: { session: AuthSession | null }; error: {message:string}|null };
type ArrowClient = { auth: { getUser: () => Promise<AuthResult>; getSession: () => Promise<SessionResult> } };
type SupabaseBrowserSdk = { createClient: (url: string, key: string, opts: {auth: Record<string,unknown>}) => ArrowClient };
declare global { interface Window { supabase?: SupabaseBrowserSdk } }
let client: ArrowClient | null = null;

export async function getArrowCloudIdentity(): Promise<{user:AuthUser;token:string}> {
 if (typeof window === 'undefined' || !window.supabase?.createClient) {
   throw new Error('ARROW cloud client is unavailable. Please reload the page.');
 }
 client ??= window.supabase.createClient(RELAY_URL,RELAY_KEY,{
   auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:false, flowType:'pkce', storageKey:STORAGE_KEY }
 });
 const verified = await client.auth.getUser();
 if (verified.error || !verified.data.user) {
   throw new Error('Sign in to the ARROW/Relay account on link9060.github.io/Resonant-Relay/ in this browser, then reload ARRAY. Cloud history is separate from live RAVIN login.');
 }
 const session = await client.auth.getSession();
 if (session.error || !session.data.session?.access_token ||
     (session.data.session.user?.id && session.data.session.user.id !== verified.data.user.id)) {
   throw new Error('ARROW session is not ready. Please sign in again to Relay.');
 }
 return {user:verified.data.user,token:session.data.session.access_token};
}
