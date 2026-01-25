import { useState } from "react";
import ExtensionPanel from "@/components/extension/ExtensionPanel";
import MockWebpage from "@/components/demo/MockWebpage";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

const Index = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      {/* Demo header */}
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          <span className="font-medium">Klartext Extension Demo</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
        >
          {isPanelOpen ? "Hide Panel" : "Show Panel"}
        </Button>
      </div>

      {/* Main content area simulating browser */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mock webpage */}
        <MockWebpage />

        {/* Extension panel */}
        <ExtensionPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>
    </div>
  );
};

export default Index;
