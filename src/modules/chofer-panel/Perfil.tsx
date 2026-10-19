import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Truck, Camera, Store } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button, Input, Label } from '@/components'
import { driverApi, ApiResponse } from '@/lib/driverApi'
import { updateDriverPassword } from '@/Fetch/driverPanel'
import { useDriverAuthStore, DriverProfile } from '@/stores/driverAuthStore'

export default function Perfil() {
  const driver = useDriverAuthStore((s) => s.driver)
  const navigate = useNavigate()
  const updateProfile = useDriverAuthStore((s) => s.updateProfile)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !driver) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await driverApi.upload<ApiResponse<DriverProfile>>(`/drivers/${driver.id_driver}/photo`, fd)
      updateProfile({ vc_photo: res.data.vc_photo })
      toast.success('Foto actualizada')
    } catch (e: any) {
      toast.error(e?.message || 'Error al subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Completa ambos campos')
      return
    }
    setSavingPassword(true)
    try {
      await updateDriverPassword(currentPassword, newPassword)
      toast.success('Contraseña actualizada')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e: any) {
      toast.error(e?.message || 'Error al cambiar la contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!driver) return null

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold text-foreground mb-4">Mi perfil</h1>

      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
            {driver.vc_photo ? (
              <img src={driver.vc_photo} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              <Truck size={36} className="text-muted-foreground" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md">
            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
          </label>
        </div>
        <p className="mt-3 font-semibold text-foreground">{driver.name}</p>
        <p className="text-sm text-muted-foreground">{driver.phone}</p>
      </div>

      <button
        onClick={() => navigate('/chofer/nueva-tienda')}
        className="w-full flex items-center gap-3 rounded-xl bg-primary text-primary-foreground p-4 shadow-md font-semibold mb-4"
      >
        <Store size={22} /> Dar de alta una tienda
      </button>

      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Cambiar contraseña</p>
        <div>
          <Label>Contraseña actual</Label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div>
          <Label>Contraseña nueva</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <Button className="w-full" onClick={handleChangePassword} disabled={savingPassword}>
          {savingPassword && <Loader2 size={14} className="mr-2 animate-spin" />}
          Guardar contraseña
        </Button>
      </div>
    </div>
  )
}
