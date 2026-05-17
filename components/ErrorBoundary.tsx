"use client";

import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error } as State;
  }

  componentDidCatch(error: Error, info: unknown) {
    // Simple client-side logging; serverside tracing (LangSmith) is handled elsewhere
    // eslint-disable-next-line no-console
    console.error("Uncaught error in UI:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6">
          <div className="max-w-xl text-center">
            <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">An unexpected error occurred. Try refreshing the page.</p>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
