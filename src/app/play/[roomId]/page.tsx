import { OnlineChessScreen } from "../../../components";

export default async function PlayRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <OnlineChessScreen roomId={roomId} role="player" />;
}
