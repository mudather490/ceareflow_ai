-- 010_storage_buckets.sql
-- Storage buckets and policies for private file storage

-- Resumes bucket (10 MB, PDF only, private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

-- Videos bucket (100 MB, webm/mp4, private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  false,
  104857600,
  array['video/webm', 'video/mp4']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = array['video/webm', 'video/mp4'];

-- Interview answers bucket (100 MB, webm/mp4, private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-answers',
  'interview-answers',
  false,
  104857600,
  array['video/webm', 'video/mp4']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = array['video/webm', 'video/mp4'];

-- Storage bucket RLS policies (owner-only access based on folder path prefix userId)
create policy "resumes owner select"
  on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes owner insert"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes owner update"
  on storage.objects for update
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes owner delete"
  on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos owner select"
  on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos owner insert"
  on storage.objects for insert
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos owner update"
  on storage.objects for update
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos owner delete"
  on storage.objects for delete
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "interview_answers owner select"
  on storage.objects for select
  using (bucket_id = 'interview-answers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "interview_answers owner insert"
  on storage.objects for insert
  with check (bucket_id = 'interview-answers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "interview_answers owner delete"
  on storage.objects for delete
  using (bucket_id = 'interview-answers' and (storage.foldername(name))[1] = auth.uid()::text);
