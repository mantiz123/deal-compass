import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  /** Arbitrary debug context (ids, payload snapshots) logged on error */
  context?: Record<string, unknown>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Surface to console so we can debug from logs
    console.error("[ErrorBoundary] Caught:", error);
    if (this.props.context) {
      try {
        console.error(
          "[ErrorBoundary] Context:",
          JSON.parse(JSON.stringify(this.props.context))
        );
      } catch {
        console.error("[ErrorBoundary] Context (raw):", this.props.context);
      }
    }
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h3 className="font-semibold text-lg">
            {this.props.fallbackTitle ?? "Ocurrió un error al cargar"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md break-words">
            {this.state.error?.message ?? "Error desconocido"}
          </p>
          <Button size="sm" variant="outline" onClick={this.reset}>
            Reintentar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
