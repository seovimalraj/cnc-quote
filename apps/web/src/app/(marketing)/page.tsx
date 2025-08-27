import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MarketingPage() {
  return (
    <main className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Marketing Home</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  );
}
