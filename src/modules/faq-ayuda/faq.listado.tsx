import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, MessageCircleQuestion, Image as ImageIcon, ListChecks } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

import { getFaqQuestions, deleteFaqQuestion, getFaqGreeting, updateFaqGreeting, FaqQuestion } from '@/Fetch/faq'
import { CrearEditarFaqDialog, FaqPantallasTab } from './components'
import { Button, PageWrapper, PageHeader, DataTable, RowActions, Card, CardContent, Textarea } from '@/components'

export function FaqAyuda() {
    const [tab, setTab] = useState<'preguntas' | 'pantallas'>('preguntas');

    const [preguntas, setPreguntas] = useState<FaqQuestion[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [preguntaSeleccionada, setPreguntaSeleccionada] = useState<FaqQuestion | null>(null);

    const [saludo, setSaludo] = useState("");
    const [loadingSaludo, setLoadingSaludo] = useState(true);
    const [guardandoSaludo, setGuardandoSaludo] = useState(false);

    const fetchData = async () => {
        try {
            const res = await getFaqQuestions();
            setPreguntas(res.data);
        } catch (error) {
            console.error("Error al cargar las preguntas:", error);
            toast.error("Error al cargar las preguntas");
        }
    };

    const fetchSaludo = async () => {
        try {
            const res = await getFaqGreeting();
            setSaludo(res.data.vc_value);
        } catch (error) {
            console.error("Error al cargar el saludo:", error);
            toast.error("Error al cargar el saludo");
        } finally {
            setLoadingSaludo(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchSaludo();
    }, []);

    const handleNuevaPregunta = () => {
        setPreguntaSeleccionada(null);
        setShowDialog(true);
    };

    const handleEditarPregunta = (pregunta: FaqQuestion) => {
        setPreguntaSeleccionada(pregunta);
        setShowDialog(true);
    };

    const handleEliminarPregunta = async (pregunta: FaqQuestion) => {
        if (!window.confirm("Seguro que quieres eliminar esta pregunta?")) return;
        try {
            await deleteFaqQuestion(pregunta.id_faq_question);
            toast.success("Pregunta eliminada exitosamente");
            fetchData();
        } catch (error) {
            console.error("Error al eliminar la pregunta:", error);
            toast.error("Error al eliminar la pregunta");
        }
    };

    const handleGuardarSaludo = async () => {
        try {
            setGuardandoSaludo(true);
            await updateFaqGreeting(saludo);
            toast.success("Saludo actualizado exitosamente");
        } catch (error) {
            console.error("Error al actualizar el saludo:", error);
            toast.error("Error al actualizar el saludo");
        } finally {
            setGuardandoSaludo(false);
        }
    };

    const columns: ColumnDef<FaqQuestion>[] = [
        {
            accessorKey: "phrases",
            header: "Formas de preguntarlo",
            cell: ({ row }) => {
                const phrases = row.original.phrases || [];
                return (
                    <div className="flex flex-col gap-1 max-w-[350px]">
                        {phrases.slice(0, 3).map((p) => (
                            <span key={p.id_faq_question_phrase} className="text-sm truncate">- {p.vc_phrase}</span>
                        ))}
                        {phrases.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{phrases.length - 3} mas</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "vc_answer_text",
            header: "Respuesta",
            cell: ({ row }) => (
                <div className="max-w-[350px]">
                    <p className="text-sm truncate">{row.original.vc_answer_text}</p>
                </div>
            ),
        },
        {
            accessorKey: "steps",
            header: "Pasos de resaltado",
            cell: ({ row }) => {
                const steps = row.original.steps || [];
                if (steps.length === 0) return <span className="text-xs text-muted-foreground">Sin pasos</span>;
                return (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ListChecks size={14} />
                        {steps.length} paso(s)
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: "Operaciones",
            cell: ({ row }) => (
                <RowActions
                    actions={[
                        { icon: Pencil, label: "Editar", onClick: () => handleEditarPregunta(row.original) },
                        { icon: Trash2, label: "Eliminar", onClick: () => handleEliminarPregunta(row.original) },
                    ]}
                />
            ),
        },
    ];

    return (
        <>
            <PageWrapper>
                <PageHeader
                    title="Dudas del promotor"
                    subtitle="Administra el saludo inicial, las preguntas frecuentes y las pantallas que se resaltan en las respuestas"
                    icon={MessageCircleQuestion}
                />

                <div className="flex items-center gap-2 border-b">
                    <button
                        type="button"
                        onClick={() => setTab('preguntas')}
                        className={
                            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition " +
                            (tab === 'preguntas' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
                        }
                    >
                        Preguntas
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('pantallas')}
                        className={
                            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 " +
                            (tab === 'pantallas' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
                        }
                    >
                        <ImageIcon size={14} />
                        Pantallas
                    </button>
                </div>

                {tab === 'preguntas' ? (
                    <>
                        <Card>
                            <CardContent className="p-5 space-y-3">
                                <h3 className="font-semibold text-foreground">Saludo inicial</h3>
                                <p className="text-sm text-muted-foreground">
                                    Es lo primero que ve el promotor al entrar a "Dudas?", antes de escribir su pregunta.
                                </p>
                                {loadingSaludo ? (
                                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                                        <Loader2 size={16} className="animate-spin" />
                                        Cargando...
                                    </div>
                                ) : (
                                    <>
                                        <Textarea value={saludo} onChange={(e) => setSaludo(e.target.value)} rows={2} />
                                        <Button onClick={handleGuardarSaludo} disabled={guardandoSaludo} size="sm">
                                            {guardandoSaludo ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                                            Guardar saludo
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Preguntas frecuentes</h3>
                            <Button onClick={handleNuevaPregunta} className="flex items-center gap-2">
                                <Plus size={18} />
                                Nueva pregunta
                            </Button>
                        </div>
                        <DataTable columns={columns} data={preguntas} pagination={{ pageSize: 100 }} />
                    </>
                ) : (
                    <FaqPantallasTab />
                )}
            </PageWrapper>

            <CrearEditarFaqDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                pregunta={preguntaSeleccionada}
                onSuccess={() => {
                    setShowDialog(false);
                    setPreguntaSeleccionada(null);
                    fetchData();
                }}
            />
        </>
    );
}
