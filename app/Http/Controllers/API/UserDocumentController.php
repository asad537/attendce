<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class UserDocumentController extends Controller
{
    public function index(User $user)
    {
        $authUser = auth()->user();

        // Access Control
        $canView = false;
        $hiddenTypes = [];

        if ($authUser->id === $user->id) {
            $canView = true;
        } elseif ($authUser->isCeo()) {
            $canView = true;
        } elseif ($authUser->isManager() && $authUser->department_id === $user->department_id) {
            $canView = true;
            $hiddenTypes = [UserDocument::TYPE_BANK_DETAILS, UserDocument::TYPE_DISCIPLINARY];
        } elseif ($authUser->isTl() && $user->manager_id === $authUser->id) {
            $canView = true;
            $hiddenTypes = [UserDocument::TYPE_SALARY_DOCUMENT, UserDocument::TYPE_BANK_DETAILS, UserDocument::TYPE_DISCIPLINARY];
        }

        if (!$canView) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = $user->documents();
        if (!empty($hiddenTypes)) {
            $query->whereNotIn('type', $hiddenTypes);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request, User $user)
    {
        $authUser = auth()->user();

        // RBAC for uploading
        $canUpload = false;
        $allowedTypes = [];

        if ($authUser->id === $user->id) {
            $canUpload = true;
            $allowedTypes = UserDocument::getEmployeeUploadableTypes();
        } elseif ($authUser->isCeo()) {
            $canUpload = true;
            $allowedTypes = UserDocument::getTypes();
        } elseif ($authUser->isManager() && $authUser->department_id === $user->department_id) {
            $canUpload = true;
            $allowedTypes = UserDocument::getTypes();
        }

        if (!$canUpload) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:' . implode(',', $allowedTypes),
            'document' => 'required|file|mimes:pdf|max:2048', // 2MB max, PDF only
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('document');
        $fileName = $file->getClientOriginalName();
        $filePath = $file->store('private/documents', 'local');

        $document = $user->documents()->create([
            'type' => $request->type,
            'name' => $fileName,
            'file_path' => $filePath,
        ]);

        return response()->json($document, 201);
    }

    public function download(UserDocument $document)
    {
        $authUser = auth()->user();
        $user = $document->user;

        $canView = false;
        $hiddenTypes = [];

        if ($authUser->id === $user->id) {
            $canView = true;
        } elseif ($authUser->isCeo()) {
            $canView = true;
        } elseif ($authUser->isManager() && $authUser->department_id === $user->department_id) {
            $canView = true;
            $hiddenTypes = [UserDocument::TYPE_BANK_DETAILS, UserDocument::TYPE_DISCIPLINARY];
        } elseif ($authUser->isTl() && $user->manager_id === $authUser->id) {
            $canView = true;
            $hiddenTypes = [UserDocument::TYPE_SALARY_DOCUMENT, UserDocument::TYPE_BANK_DETAILS, UserDocument::TYPE_DISCIPLINARY];
        }

        if (!$canView || in_array($document->type, $hiddenTypes)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!Storage::disk('local')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return Storage::disk('local')->download($document->file_path, $document->name);
    }

    public function destroy(UserDocument $document)
    {
        $authUser = auth()->user();
        $user = $document->user;

        $canDelete = false;

        if ($authUser->id === $user->id && in_array($document->type, UserDocument::getEmployeeUploadableTypes())) {
            $canDelete = true;
        } elseif ($authUser->isCeo()) {
            $canDelete = true;
        } elseif ($authUser->isManager() && $authUser->department_id === $user->department_id) {
            $canDelete = true;
        }

        if (!$canDelete) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (Storage::disk('local')->exists($document->file_path)) {
            Storage::disk('local')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
