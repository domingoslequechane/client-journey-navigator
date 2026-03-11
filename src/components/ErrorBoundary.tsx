import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Optional fallback UI — if not provided, the default error screen is shown */
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/app';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { error } = this.state;
            const supportMessage = encodeURIComponent(
                `Olá, encontrei um erro na aplicação Qualify.\n\nErro: ${error?.message || 'Erro desconhecido'}\n\nPor favor, podem ajudar-me?`
            );

            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
                    <div className="max-w-md w-full text-center space-y-6">
                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className="h-24 w-24 rounded-2xl bg-destructive/10 flex items-center justify-center">
                                <AlertTriangle className="h-12 w-12 text-destructive" />
                            </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">
                                Algo correu mal
                            </h1>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Ocorreu um erro inesperado nesta página. Os seus dados estão seguros.
                                Tente recarregar ou voltar ao início.
                            </p>
                        </div>

                        {/* Error details (collapsed) */}
                        {error?.message && (
                            <details className="text-left bg-muted/50 rounded-xl p-4 border text-xs font-mono text-muted-foreground cursor-pointer">
                                <summary className="font-sans text-sm font-medium text-foreground cursor-pointer select-none mb-2">
                                    Detalhes técnicos
                                </summary>
                                <code className="break-all whitespace-pre-wrap">{error.message}</code>
                            </details>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={this.handleReload}
                                className="gap-2 w-full"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Recarregar página
                            </Button>
                            <Button
                                variant="outline"
                                onClick={this.handleGoHome}
                                className="gap-2 w-full"
                            >
                                <Home className="h-4 w-4" />
                                Ir para o início
                            </Button>
                            <a
                                href={`https://wa.me/258868499221?text=${supportMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full rounded-lg border border-[#25D366]/30 text-[#25D366] text-sm font-semibold px-4 py-2.5 hover:bg-[#25D366]/10 transition-colors"
                            >
                                <MessageCircle className="h-4 w-4" />
                                Contactar Suporte
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * A lightweight route-level error boundary wrapper.
 * Wrap individual pages/routes to prevent one page crash
 * from taking down the whole application.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
}
