import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Brain, FileText } from "lucide-react";

interface ProcessingTypeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (type: "fixo" | "dinamico") => void;
  studentName: string;
}

export const ProcessingTypeModal = ({ isOpen, onOpenChange, onConfirm, studentName }: ProcessingTypeModalProps) => {
  const [selectedType, setSelectedType] = useState<"fixo" | "dinamico">("fixo");

  const handleConfirm = () => {
    onConfirm(selectedType);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipo de Processamento</DialogTitle>
          <DialogDescription>
            Escolha o tipo de processamento para o aluno <strong>{studentName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <RadioGroup 
            value={selectedType} 
            onValueChange={(value: string) => {
              if (value === "fixo" || value === "dinamico") {
                setSelectedType(value);
              }
            }}
          >
            <Card className="p-4 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="fixo" id="fixo" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="fixo" className="font-medium cursor-pointer flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Prompt Fixo
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Usa perguntas padrão pré-definidas para avaliação. A avaliação é gerada por IA após responder as perguntas.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="dinamico" id="dinamico" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="dinamico" className="font-medium cursor-pointer flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Prompt Dinâmico
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gera perguntas personalizadas usando Inteligência Artificial
                  </p>
                </div>
              </div>
            </Card>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Iniciar Avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};