import { useState, useMemo } from 'react';
import { DataBarChart, DataPieChart } from './Charts';
import { FileText, Database, BarChart3, Table as TableIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface DashboardProps {
    data: any;
    onReset: () => void;
}

export function Dashboard({ data, onReset }: DashboardProps) {
    // Lógica simples para detectar colunas numéricas e categóricas
    const numericColumns = useMemo(() => {
        return Object.entries(data.dtypes)
            .filter(([_, type]) => (type as string).includes('int') || (type as string).includes('float'))
            .map(([col]) => col);
    }, [data]);

    const categoryColumns = useMemo(() => {
        return Object.entries(data.dtypes)
            .filter(([_, type]) => (type as string).includes('object') || (type as string).includes('string'))
            .map(([col]) => col);
    }, [data]);

    // Preparar dados agregados para gráficos
    // Agrupa por categoria e soma os valores numéricos
    const chartData = useMemo(() => {
        if (!data.preview || data.preview.length === 0) return [];
        if (numericColumns.length === 0 || categoryColumns.length === 0) return [];

        const category = categoryColumns[0];
        const metric = numericColumns[0];

        // Agregar dados: agrupar por categoria e somar métrica
        const aggregated: { [key: string]: number } = {};

        data.preview.forEach((row: any) => {
            const catValue = row[category];
            const metricValue = parseFloat(row[metric]);

            if (catValue && !isNaN(metricValue)) {
                const key = String(catValue);
                aggregated[key] = (aggregated[key] || 0) + metricValue;
            }
        });

        // Converter para array de objetos para recharts
        return Object.entries(aggregated).map(([name, value]) => ({
            [category]: name,
            [metric]: value
        }));
    }, [data.preview, numericColumns, categoryColumns]);

    const [selectedMetric, setSelectedMetric] = useState(numericColumns[0] || '');
    const [selectedCategory, setSelectedCategory] = useState(categoryColumns[0] || '');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Análise de Dados</h2>
                    <p className="text-muted-foreground">Explorando arquivo: {data.filename}</p>
                </div>
                <button
                    onClick={onReset}
                    className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                    Carregar outro arquivo
                </button>
            </div>

            {/* Cards de KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total de Linhas" value={data.row_count} icon={Database} />
                <KpiCard title="Colunas" value={data.columns.length} icon={TableIcon} />
                <KpiCard title="Métricas Numéricas" value={numericColumns.length} icon={BarChart3} />
                <KpiCard title="Categorias" value={categoryColumns.length} icon={FileText} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Gráfico Principal */}
                <div className="col-span-4 glass-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Visualização Gráfica</h3>
                        {/* Selectors para alterar eixos podiam vir aqui */}
                    </div>
                    {numericColumns.length > 0 && selectedCategory ? (
                        <DataBarChart data={chartData} xKey={selectedCategory} yKey={selectedMetric} />
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            Dados insuficientes para gráficos
                        </div>
                    )}
                </div>

                {/* Tabela ou Pizza */}
                <div className="col-span-3 glass-card p-6">
                    <h3 className="font-semibold text-lg mb-4">Distribuição</h3>
                    {numericColumns.length > 0 && selectedCategory ? (
                        <DataPieChart data={chartData} nameKey={selectedCategory} valueKey={selectedMetric} />
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            Dados insuficientes para gráficos
                        </div>
                    )}
                </div>
            </div>

            {/* Tabela de Preview */}
            <div className="glass-card p-6 overflow-hidden">
                <h3 className="font-semibold text-lg mb-4">Pré-visualização dos Dados</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted/50">
                            <tr>
                                {data.columns.map((col: string) => (
                                    <th key={col} className="px-6 py-3">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.preview.map((row: any, i: number) => (
                                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors text-black">
                                    {data.columns.map((col: string) => (
                                        <td key={`${i}-${col}`} className="px-6 py-4 font-medium whitespace-nowrap">
                                            {row[col]?.toString()}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon }: any) {
    return (
        <div className="glass-card p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="text-2xl font-bold mt-2">{value}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Icon className="h-5 w-5" />
            </div>
        </div>
    )
}
