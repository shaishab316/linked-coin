import { redirect } from "next/navigation";

export default async function GenericShareRedirect({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  redirect(`/${locale}/share/people/${token}`);
}
