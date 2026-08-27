<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EmployeeSatisfactionRating;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EmployeeSatisfactionRatingController extends Controller
{
    /**
     * Get aggregate ratings for a specific user.
     */
    public function index(User $user)
    {
        $ratings = EmployeeSatisfactionRating::where('user_id', $user->id)->get();

        if ($ratings->isEmpty()) {
            return response()->json([
                'average_overall' => 0,
                'compensation_benefits' => 0,
                'work_culture' => 0,
                'work_life_balance' => 0,
                'career_growth' => 0,
                'total_ratings' => 0
            ]);
        }

        $compensation = round($ratings->avg('compensation_benefits'), 1);
        $workCulture = round($ratings->avg('work_culture'), 1);
        $workLifeBalance = round($ratings->avg('work_life_balance'), 1);
        $careerGrowth = round($ratings->avg('career_growth'), 1);

        $overall = round(($compensation + $workCulture + $workLifeBalance + $careerGrowth) / 4, 1);
        
        // Convert to percentage for the overall gauge (e.g. 4.0 out of 5 => 80%)
        $overallPercentage = round(($overall / 5) * 100);

        return response()->json([
            'average_overall' => $overall,
            'overall_percentage' => $overallPercentage,
            'compensation_benefits' => $compensation,
            'work_culture' => $workCulture,
            'work_life_balance' => $workLifeBalance,
            'career_growth' => $careerGrowth,
            'total_ratings' => $ratings->count(),
        ]);
    }

    /**
     * Get aggregate ratings for the entire company.
     */
    public function companyOverall()
    {
        $ratings = EmployeeSatisfactionRating::all();

        if ($ratings->isEmpty()) {
            return response()->json([
                'average_overall' => 0,
                'overall_percentage' => 0,
                'compensation_benefits' => 0,
                'work_culture' => 0,
                'work_life_balance' => 0,
                'career_growth' => 0,
                'total_ratings' => 0
            ]);
        }

        $compensation = round($ratings->avg('compensation_benefits'), 1);
        $workCulture = round($ratings->avg('work_culture'), 1);
        $workLifeBalance = round($ratings->avg('work_life_balance'), 1);
        $careerGrowth = round($ratings->avg('career_growth'), 1);

        $overall = round(($compensation + $workCulture + $workLifeBalance + $careerGrowth) / 4, 1);
        $overallPercentage = round(($overall / 5) * 100);

        return response()->json([
            'average_overall' => $overall,
            'overall_percentage' => $overallPercentage,
            'compensation_benefits' => $compensation,
            'work_culture' => $workCulture,
            'work_life_balance' => $workLifeBalance,
            'career_growth' => $careerGrowth,
            'total_ratings' => $ratings->count(),
        ]);
    }

    /**
     * Store or update a rating from the authenticated user to another employee.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'compensation_benefits' => 'required|integer|min:1|max:5',
            'work_culture' => 'required|integer|min:1|max:5',
            'work_life_balance' => 'required|integer|min:1|max:5',
            'career_growth' => 'required|integer|min:1|max:5',
        ]);

        $rating = EmployeeSatisfactionRating::updateOrCreate(
            [
                'rated_by_id' => $request->user()->id
            ],
            [
                'compensation_benefits' => $validated['compensation_benefits'],
                'work_culture' => $validated['work_culture'],
                'work_life_balance' => $validated['work_life_balance'],
                'career_growth' => $validated['career_growth'],
            ]
        );

        return response()->json([
            'message' => 'Rating submitted successfully',
            'data' => $rating
        ]);
    }
}
