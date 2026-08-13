import { motion } from 'framer-motion';
import { IconPhoto, IconMap, IconEye } from '@tabler/icons-react';
import type { ChatExpeditionAlbum, ChatAlbumMedia } from '@/lib/database.types';

interface ExpeditionAlbumCardProps {
  album: ChatExpeditionAlbum;
  media: ChatAlbumMedia[];
  onView?: () => void;
}

export function ExpeditionAlbumCard({ album, media, onView }: ExpeditionAlbumCardProps) {
  const hasCover = !!album.cover_url;
  const photos = media.filter(m => m.media_type === 'image');
  const coverImage = album.cover_url || photos[0]?.media_url;
  const firstFour = photos.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden bg-white border border-black/5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Cover or thumbnail grid */}
      {hasCover && coverImage ? (
        <div className="relative aspect-[16/9] overflow-hidden">
          <img src={coverImage} alt={album.title || 'Album cover'} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <IconPhoto className="w-3.5 h-3.5" />
            {album.photo_count}
          </div>
        </div>
      ) : firstFour.length > 0 ? (
        <div className="grid grid-cols-2 aspect-[16/9]">
          {firstFour.map((m, i) => (
            <div key={m.id} className="overflow-hidden">
              <img
                src={m.thumbnail_url || m.media_url}
                alt=""
                className={`w-full h-full object-cover ${i % 2 === 0 ? '' : ''}`}
              />
            </div>
          ))}
          {firstFour.length < 4 && (
            <div className="bg-black/5 flex items-center justify-center">
              <IconPhoto className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <IconPhoto className="w-10 h-10 text-gray-300" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h4 className="font-bold text-sm truncate">{album.title || 'Untitled Album'}</h4>
        {album.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{album.description}</p>
        )}

        {/* Map summary */}
        {album.journey_summary && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-brand-emerald font-medium">
            <IconMap className="w-3.5 h-3.5" />
            <span>Route map available</span>
          </div>
        )}

        {onView && (
          <button
            onClick={onView}
            className="mt-3 w-full py-2 bg-gradient-to-r from-brand-emerald to-emerald-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-brand-emerald/30 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <IconEye className="w-4 h-4" /> View Album
          </button>
        )}
      </div>
    </motion.div>
  );
}
