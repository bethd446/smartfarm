'use client'

import { useState, useTransition, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  animalId: string
  currentUrl: string | null
  uploadAction: (formData: FormData) => Promise<{ ok: boolean; error?: string; url?: string }>
}

/**
 * H1 — Composant client upload photo animal.
 *
 * - Affiche la photo courante (ou placeholder porc charté)
 * - Bouton "Changer la photo" déclenche un <input type=file>
 * - Envoie au Server Action `uploadPhotoAnimal`
 * - Affiche état (uploading / error / success)
 */
export function AnimalPhotoUpload({ animalId, currentUrl, uploadAction }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    // Preview optimiste local
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    const fd = new FormData()
    fd.set('animal_id', animalId)
    fd.set('photo', file)

    startTransition(async () => {
      const res = await uploadAction(fd)
      if (!res.ok) {
        setError(res.error ?? 'Échec de l’upload')
        setPreviewUrl(currentUrl)
      } else if (res.url) {
        setPreviewUrl(res.url)
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative h-40 w-40 shrink-0 rounded-md border-2 border-[var(--sf-line)] bg-[var(--sf-surface-2)] overflow-hidden flex items-center justify-center"
        aria-label="Photo de l'animal"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Photo animal"
            className="object-cover h-full w-full"
          />
        ) : (
          <div className="flex flex-col items-center text-[var(--sf-muted)]">
            <Camera className="h-10 w-10" aria-hidden />
            <span className="text-[10px] mt-1 font-bold">
              Aucune photo
            </span>
          </div>
        )}
        {isPending ? (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        disabled={isPending}
        aria-label="Sélectionner une photo"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="h-4 w-4 mr-2" aria-hidden />
        {previewUrl ? 'Changer la photo' : 'Ajouter une photo'}
      </Button>

      {error ? (
        <p
          role="alert"
          className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] flex items-center gap-1"
        >
          <X className="h-3 w-3" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  )
}
