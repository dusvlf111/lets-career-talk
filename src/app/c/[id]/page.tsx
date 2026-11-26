import ChannelView from '@/components/ChannelView';

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChannelView channelId={id} />;
}
