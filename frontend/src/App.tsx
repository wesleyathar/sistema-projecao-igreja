import { useState } from 'react';
import { Upload } from './components/Upload';
import { Dashboard } from './components/Dashboard';

function App() {
  const [data, setData] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8 font-sans text-foreground">

      {/* Header */}
      <header className="mb-10 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">BI</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">DataIntel</h1>
        </div>
        <div className="flex gap-4">
          {/* Actions */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full">
        {!data ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-4 max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
                Transforme seus dados em inteligência.
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Arraste sua planilha Excel ou CSV e obtenha insights instantâneos com visualizações automáticas.
              </p>
            </div>
            <Upload onUploadSuccess={setData} />
          </div>
        ) : (
          <Dashboard data={data} onReset={() => setData(null)} />
        )}
      </main>

    </div>
  );
}

export default App;
