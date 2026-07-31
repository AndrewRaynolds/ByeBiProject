import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Uncaught frontend rendering error", error, errorInfo);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }

    return this.props.children;
  }
}

export default function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <main
          className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white"
          id="main-content"
          tabIndex={-1}
        >
          <section
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-8 text-center shadow-2xl"
            role="alert"
          >
            <AlertTriangle
              aria-hidden="true"
              className="mx-auto mb-5 h-12 w-12 text-amber-400"
            />
            <h1 className="text-2xl font-bold">{t("errorBoundary.title")}</h1>
            <p className="mt-3 text-slate-300">
              {t("errorBoundary.description")}
            </p>

            {import.meta.env.DEV && (
              <details className="mt-5 rounded-lg bg-black/30 p-3 text-left text-sm text-slate-300">
                <summary className="cursor-pointer font-medium">
                  {t("errorBoundary.details")}
                </summary>
                <code className="mt-2 block break-words">{error.message}</code>
              </details>
            )}

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={reset} variant="secondary">
                <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
                {t("errorBoundary.retry")}
              </Button>
              <Button asChild>
                <a href="/">
                  <Home aria-hidden="true" className="mr-2 h-4 w-4" />
                  {t("errorBoundary.backHome")}
                </a>
              </Button>
            </div>
          </section>
        </main>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
