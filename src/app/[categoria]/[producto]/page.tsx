export const runtime = 'edge';

import { redirect } from 'next/navigation';

// Redirige /categoria/slug → /slug
export default function RedirectPage({ params }: { params: { categoria: string; producto: string } }) {
  redirect(`/${params.producto}`);
}
