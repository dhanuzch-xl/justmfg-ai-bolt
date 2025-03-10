/*
  # Initial schema for manufacturing platform

  1. Tables
    - `files`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `path` (text)
      - `size` (bigint)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `folders`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `path` (text)
      - `parent_id` (uuid, references folders)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  path text NOT NULL,
  size bigint NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  path text NOT NULL,
  parent_id uuid REFERENCES folders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own files"
ON files
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own folders"
ON folders
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);