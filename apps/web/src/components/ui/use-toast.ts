import { toast as sonnerToast } from "sonner"

export function toast(props: { title?: string; description?: string }) {
  return sonnerToast(props.title, {
    description: props.description
  })
}
