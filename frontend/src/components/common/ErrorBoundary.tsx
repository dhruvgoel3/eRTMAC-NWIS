import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[NWIS ErrorBoundary] Component crashed:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "36px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "320px",
            textAlign: "center",
            background: "var(--color-sheet-white)",
            border: "1px solid var(--color-sage-mist)",
            borderRadius: "16px",
            margin: "20px auto",
            maxWidth: "600px",
            boxShadow: "0 4px 20px rgba(16, 67, 54, 0.04)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(185, 28, 66, 0.1)",
              border: "1px solid rgba(185, 28, 66, 0.25)",
              color: "#b91c42",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <AlertTriangle style={{ width: 28, height: 28 }} />
          </div>

          <h3
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-bark)",
              marginBottom: "8px",
            }}
          >
            {this.props.fallbackTitle || "An unexpected error occurred in this view"}
          </h3>

          <p
            style={{
              fontSize: "12.5px",
              color: "var(--color-slate)",
              lineHeight: 1.5,
              maxWidth: "420px",
              marginBottom: "20px",
            }}
          >
            {this.state.error?.message ||
              "A rendering exception was safely intercepted. Real-time telemetry monitoring remains active in the background."}
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 20px",
              fontSize: "13px",
            }}
          >
            <RotateCcw style={{ width: 15, height: 15 }} />
            <span>Reload Component View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
