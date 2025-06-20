import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    if (authService.isAuthenticated()) {
      navigate("/");
      return;
    }

    // Handle OAuth callback from Google redirect
    const token = searchParams.get("token");
    const userParam = searchParams.get("user");
    const error = searchParams.get("error");

    if (error) {
      let errorMessage = "Failed to authenticate with Google. Please try again.";
      
      switch (error) {
        case "no_code":
          errorMessage = "No authorization code received from Google.";
          break;
        case "server_config":
          errorMessage = "Server configuration error. Please contact support.";
          break;
        case "auth_failed":
          errorMessage = "Authentication failed. Please try again.";
          break;
        default:
          errorMessage = `Authentication error: ${error}`;
      }

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Clear error from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("error");
      window.history.replaceState({}, "", newUrl.toString());
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Use AuthService to properly set authentication data
        authService.setAuthData(token, user);
        
        toast({
          title: "Success",
          description: "Successfully authenticated with Google!",
        });
        
        // Clear parameters from URL and navigate to dashboard
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("token");
        newUrl.searchParams.delete("user");
        window.history.replaceState({}, "", newUrl.toString());
        
        navigate("/");
      } catch (parseError) {
        console.error("Error parsing user data:", parseError);
        toast({
          title: "Authentication Error",
          description: "Failed to process authentication data. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // Handle legacy OAuth callback (if using POST method)
    const code = searchParams.get("code");
    if (code) {
      handleOAuthCallback(code);
    }
  }, [searchParams, navigate, toast]);

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    try {
      await authService.handleOAuthCallback(code);
      toast({
        title: "Success",
        description: "Successfully authenticated with Google!",
      });
      navigate("/");
    } catch (error) {
      console.error("OAuth callback error:", error);
      toast({
        title: "Authentication Error",
        description: "Failed to complete authentication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await authService.initiateGoogleOAuth();
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to initiate Google login. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Smart Email Tracker account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </div>
            )}
          </Button>
          
          <div className="text-center text-sm text-gray-600">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
