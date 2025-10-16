import RoomView from '@/components/room/RoomView';

export const dynamic = 'force-dynamic';

interface RoomPageProps {
  params: { roomId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function RoomPage({ params, searchParams }: RoomPageProps) {
  const playerIdParam = searchParams.playerId;
  const playerId = Array.isArray(playerIdParam) ? playerIdParam[0] : playerIdParam;

  return <RoomView roomId={params.roomId} playerId={playerId ?? ''} />;
}
