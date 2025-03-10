import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  try {
    const files = db.getFilesInFolder(folderId || '/');
    const folders = db.getSubfolders(folderId || '/');

    return NextResponse.json({ files, folders });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { file, folderId } = body;

    db.saveFile(file, folderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { fileId, metadata } = body;

    db.updateFileMetadata(fileId, metadata);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating file metadata:', error);
    return NextResponse.json({ error: 'Failed to update file metadata' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const folderId = searchParams.get('folderId');

  try {
    if (fileId) {
      db.deleteFile(fileId);
    } else if (folderId) {
      db.deleteFolder(folderId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}