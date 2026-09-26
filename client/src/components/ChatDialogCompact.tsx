import PlannerDialog from "./PlannerDialog";

export default function ChatDialogCompact(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
}) {
  return <PlannerDialog {...props} brand="byebro" />;
}
