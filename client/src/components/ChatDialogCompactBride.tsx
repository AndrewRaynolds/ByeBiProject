import PlannerDialog from "./PlannerDialog";

export default function ChatDialogCompactBride(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
}) {
  return <PlannerDialog {...props} brand="byebride" />;
}
