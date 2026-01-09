import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useEventTemplates, EventTemplate } from "@/hooks/useEventTemplates";
import { EventTemplateCard } from "@/components/EventTemplateCard";
import { CreateTemplateDialog } from "@/components/CreateTemplateDialog";

export default function Templates() {
  const navigate = useNavigate();
  const { templates, isLoading, createTemplate, isCreating, updateTemplate, isUpdating, deleteTemplate } =
    useEventTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null);

  const handleCreate = (template: Omit<EventTemplate, "id" | "user_id" | "created_at" | "updated_at">) => {
    createTemplate(template);
  };

  const handleEdit = (template: EventTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleUpdate = (template: Omit<EventTemplate, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (editingTemplate) {
      updateTemplate({ id: editingTemplate.id, ...template });
      setEditingTemplate(null);
    }
  };

  const handleUse = (template: EventTemplate) => {
    // Navigate to create event with template data pre-filled
    const params = new URLSearchParams({
      title: template.title,
      description: template.description || "",
      time: template.default_time.slice(0, 5),
      priority: template.priority,
      recurrence: template.recurrence_type || "",
    });
    navigate(`/create-event?${params.toString()}`);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-3xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              Event Templates
            </h1>
            <p className="text-muted-foreground mt-2">
              Create reusable templates for quick event scheduling
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Create templates for events you schedule frequently, like weekly meetings or daily standups.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <EventTemplateCard
                key={template.id}
                template={template}
                onUse={handleUse}
                onEdit={handleEdit}
                onDelete={deleteTemplate}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <CreateTemplateDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          onSubmit={editingTemplate ? handleUpdate : handleCreate}
          isLoading={isCreating || isUpdating}
          editTemplate={editingTemplate}
        />
      </div>
    </AppLayout>
  );
}
