import { toast as hotToast } from "react-hot-toast"

export function toast(props: { title?: string; description?: string }) {
  return hotToast(props.title || props.description || "", {
    duration: 4000,
  })
}
