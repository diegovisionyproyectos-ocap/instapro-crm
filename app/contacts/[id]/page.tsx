import ContactExpediente from '@/components/ContactExpediente';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactExpediente id={id} />;
}
