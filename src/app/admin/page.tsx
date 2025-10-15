// src/app/admin/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Image from 'next/image';

export default async function AdminDashboard() {
  const supabase = createServerComponentClient({ cookies });

  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*');

  if (photosError) {
    console.error('Error fetching photos:', photosError);
    return <div className="p-8 text-red-500">Error loading photos. Please check your RLS policies.</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Admin Photo Gallery</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <div key={photo.id} className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <Image
              src={photo.url}
              alt={photo.name || 'Photo'}
              width={500}
              height={500}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
            <p className="text-sm font-semibold">Photo ID: {photo.id}</p>
            <p className="text-sm text-gray-500">Uploaded on: {new Date(photo.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}