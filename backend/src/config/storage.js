import { getSupabase } from './database.js';

const supabase = getSupabase();

export const STORAGE_BUCKETS = {
    DOCUMENTS: 'documents',
    AVATARS: 'avatars'
};

export async function initializeStorage() {
    // Create buckets if they don't exist
    const { data: buckets } = await supabase.storage.listBuckets();

    const existingBuckets = buckets?.map(b => b.name) || [];

    for (const bucketName of Object.values(STORAGE_BUCKETS)) {
        if (!existingBuckets.includes(bucketName)) {
            await supabase.storage.createBucket(bucketName, {
                public: false,
                fileSizeLimit: 10485760 // 10MB
            });
        }
    }
}

export async function uploadFile(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, options);

    if (error) throw error;
    return data;
}

export async function getFileUrl(bucket, path) {
    const { data } = await supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return data.publicUrl;
}

export async function deleteFile(bucket, path) {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) throw error;
}

export default {
    STORAGE_BUCKETS,
    initializeStorage,
    uploadFile,
    getFileUrl,
    deleteFile
};
