import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AnimatedContainer animation="scale-in" duration={0.5}>
        <Card className="w-full max-w-md text-center">
          <CardHeader className="pb-4">
            <AnimatedContainer animation="fade-up" delay={0.1}>
              <div className="h-20 w-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
            </AnimatedContainer>
            <AnimatedContainer animation="fade-up" delay={0.2}>
              <CardTitle className="text-6xl font-bold text-primary mb-2">404</CardTitle>
            </AnimatedContainer>
            <AnimatedContainer animation="fade-up" delay={0.3}>
              <CardDescription className="text-lg">
                Página não encontrada
              </CardDescription>
            </AnimatedContainer>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatedContainer animation="fade-up" delay={0.4}>
              <p className="text-muted-foreground">
                A página que você está procurando não existe ou foi movida.
              </p>
            </AnimatedContainer>
            <AnimatedContainer animation="fade-up" delay={0.5}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link to="/" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/app" className="gap-2">
                    <Home className="h-4 w-4" />
                    Ir para o Dashboard
                  </Link>
                </Button>
              </div>
            </AnimatedContainer>
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
};

export default NotFound;
