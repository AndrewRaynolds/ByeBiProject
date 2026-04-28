import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function useBrandVariant(): "bro" | "bride" {
  const [brand, setBrand] = React.useState<"bro" | "bride">("bro")

  React.useEffect(() => {
    const saved = localStorage.getItem("selectedBrand")
    setBrand(saved === "byebride" ? "bride" : "bro")

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "selectedBrand") {
        setBrand(e.newValue === "byebride" ? "bride" : "bro")
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  return brand
}

export function Toaster() {
  const { toasts } = useToast()
  const brandVariant = useBrandVariant()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const resolvedVariant = variant ?? brandVariant
        return (
          <Toast key={id} variant={resolvedVariant} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
