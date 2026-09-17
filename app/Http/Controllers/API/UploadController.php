<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class UploadController extends Controller
{
    /**
     * Handle file upload for rich text editors or general attachments.
     */
    public function uploadFile(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:jpeg,png,jpg,gif,pdf|max:2048',
        ], [
            'file.max' => 'The file must not be greater than 2MB.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors()->first('file')
            ], 422);
        }

        $file = $request->file('file');
        
        // Generate a unique name
        $extension = $file->getClientOriginalExtension();
        $filename = uniqid('upload_') . '_' . time() . '.' . $extension;

        // Store the file in storage/app/public/uploads/files
        $path = $file->storeAs('uploads/files', $filename, 'public');

        // Return the absolute URL
        $url = asset('storage/' . $path);

        $type = in_array(strtolower($extension), ['jpeg', 'png', 'jpg', 'gif']) ? 'image' : 'document';

        return response()->json([
            'url' => $url,
            'type' => $type,
            'filename' => $file->getClientOriginalName()
        ]);
    }
}
