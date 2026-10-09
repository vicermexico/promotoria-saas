import { toast } from "sonner"
import { useEffect, useRef, useState } from "react"
import { Loader2, Clapperboard, UploadCloud, Trash2, ArrowUp, ArrowDown, AlertTriangle, CheckCircle2, Video } from "lucide-react"

import { getIntroVideos, addIntroVideoClip, deleteIntroVideoClip, reorderIntroVideoClips, processIntroVideoCheckpoint, IntroVideoCheckpointState } from "@/Fetch/introVideos"
import { Button, PageWrapper, PageHeader, Card, CardContent } from "@/components"

function CheckpointCard({ checkpoint, onChanged }: { checkpoint: IntroVideoCheckpointState; onChanged: () => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [borrandoId, setBorrandoId] = useState<number | null>(null);
  const [moviendo, setMoviendo] = useState(false);
  const [uniendo, setUniendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("El archivo debe ser un video");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("El video no debe superar los 50MB");
      return;
    }
    setSubiendo(true);
    try {
      const res = await addIntroVideoClip(checkpoint.key, file);
      if (res.ok) {
        toast.success("Video agregado exitosamente");
        onChanged();
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al subir el video");
    } finally {
      setSubiendo(false);
    }
  };

  const handleBorrar = async (id_clip: number) => {
    setBorrandoId(id_clip);
    try {
      await deleteIntroVideoClip(id_clip);
      toast.success("Video eliminado exitosamente");
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar el video");
    } finally {
      setBorrandoId(null);
    }
  };

  const handleMover = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= checkpoint.clips.length) return;
    const ids = checkpoint.clips.map((c) => c.id_clip);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setMoviendo(true);
    try {
      await reorderIntroVideoClips(checkpoint.key, ids);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Error al reordenar");
    } finally {
      setMoviendo(false);
    }
  };

  const handleUnir = async () => {
    setUniendo(true);
    try {
      await processIntroVideoCheckpoint(checkpoint.key);
      toast.success("Videos unidos exitosamente");
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Error al unir los videos");
    } finally {
      setUniendo(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Clapperboard size={18} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground">{checkpoint.label}</h3>
          </div>
          {checkpoint.clips.length > 0 && (
            checkpoint.needs_reprocessing ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warning/15 text-warning-foreground dark:text-warning text-xs rounded-full">
                <AlertTriangle size={12} /> Falta unir los clips
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/15 text-success text-xs rounded-full">
                <CheckCircle2 size={12} /> Listo
              </span>
            )
          )}
        </div>

        {checkpoint.clips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay ningún video para este punto.</p>
        ) : (
          <div className="space-y-2">
            {checkpoint.clips.map((clip, index) => (
              <div key={clip.id_clip} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <Video size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground flex-1 truncate">Clip {index + 1}</span>
                <Button size="sm" variant="outline" disabled={index === 0 || moviendo} onClick={() => handleMover(index, -1)}>
                  <ArrowUp size={14} />
                </Button>
                <Button size="sm" variant="outline" disabled={index === checkpoint.clips.length - 1 || moviendo} onClick={() => handleMover(index, 1)}>
                  <ArrowDown size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={borrandoId === clip.id_clip}
                  onClick={() => handleBorrar(clip.id_clip)}
                >
                  {borrandoId === clip.id_clip ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </Button>
              </div>
            ))}
          </div>
        )}

        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleArchivo} />
        <Button variant="outline" className="w-full" disabled={subiendo} onClick={() => inputRef.current?.click()}>
          {subiendo ? <Loader2 size={16} className="mr-2 animate-spin" /> : <UploadCloud size={16} className="mr-2" />}
          Agregar video
        </Button>

        {checkpoint.needs_reprocessing && (
          <Button variant="outline" className="w-full" disabled={uniendo} onClick={handleUnir}>
            {uniendo ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Clapperboard size={16} className="mr-2" />}
            Reintentar unir videos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function VideosIntroduccion() {
  const [checkpoints, setCheckpoints] = useState<IntroVideoCheckpointState[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    getIntroVideos()
      .then((res) => {
        if (res.ok) setCheckpoints(res.data);
      })
      .catch(() => toast.error("Error al cargar los videos de introducción"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  if (loading)
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando...</span>
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <PageHeader
        title="Videos de introducción"
        subtitle="Sube los videos con fondo verde que explican cada parte de la tarea al promotor"
        icon={Clapperboard}
      />

      <p className="text-sm text-muted-foreground -mt-2">
        Puedes subir varios videos por cada punto — se van a unir automáticamente en uno solo, en el orden en que los acomodes aquí.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checkpoints.map((cp) => (
          <CheckpointCard key={cp.key} checkpoint={cp} onChanged={cargar} />
        ))}
      </div>
    </PageWrapper>
  );
}
