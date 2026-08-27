<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'JPY', 'CNY'];
    private const ACCENTS = ['emerald', 'teal', 'green', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red', 'orange', 'amber'];

    public function index(): JsonResponse
    {
        return response()->json(['settings' => $this->current()]);
    }

    public function update(Request $request): JsonResponse
    {
        // Only the CEO (admin) and managers may change organisation-wide settings.
        $role = $request->user()->role;
        abort_unless(in_array($role, ['ceo', 'manager']), 403, 'You are not allowed to change these settings.');

        $data = $request->validate([
            'currency' => ['sometimes', 'string', 'in:' . implode(',', self::CURRENCIES)],
            'accent' => ['sometimes', 'string', 'in:' . implode(',', self::ACCENTS)],
        ]);

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return response()->json(['settings' => $this->current()]);
    }

    private function current(): array
    {
        $map = Setting::map();
        return [
            'currency' => $map['currency'] ?? 'USD',
            'accent' => $map['accent'] ?? 'emerald',
            'currencies' => self::CURRENCIES,
            'accents' => self::ACCENTS,
        ];
    }
}
