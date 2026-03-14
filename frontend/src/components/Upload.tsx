import { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';

interface UploadProps {
    onUploadSuccess: (data: any) => void;
}

export function Upload({ onUploadSuccess }: UploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
            setError("Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV.");
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Nota: URL hardcoded para dev, em prod deve ser configurável
            const response = await axios.post('http://localhost:8000/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadSuccess(response.data);
        } catch (err) {
            console.error(err);
            setError("Erro ao processar o arquivo. Verifique se o Backend está rodando.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-10">
            <div
                className={cn(
                    "relative group rounded-3xl border-2 border-dashed transition-all duration-300 ease-out p-12 text-center overflow-hidden",
                    isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    "glass-card"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFileInput}
                    accept=".xlsx,.xls,.csv"
                    disabled={isUploading}
                />

                <div className="flex flex-col items-center justify-center gap-4 relative z-0">
                    <div className={cn(
                        "p-4 rounded-full bg-primary/10 text-primary transition-all duration-500",
                        isUploading ? "animate-pulse" : ""
                    )}>
                        {isUploading ? (
                            <Loader2 className="w-10 h-10 animate-spin" />
                        ) : (
                            <UploadCloud className="w-10 h-10" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-semibold tracking-tight">
                            {isUploading ? "Processando seus dados..." : "Solte sua planilha aqui"}
                        </h3>
                        <p className="text-muted-foreground">
                            Ou clique para selecionar um arquivo (.xlsx, .csv)
                        </p>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
