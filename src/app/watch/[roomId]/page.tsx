import { OnlineChessScreen } from "../../../components";

export default async function WatchRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <OnlineChessScreen roomId={roomId} role="spectator" />;
}
