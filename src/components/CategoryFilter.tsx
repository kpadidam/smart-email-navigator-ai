
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Package, Briefcase, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { logger } from "@/utils/logger";

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  refreshTrigger?: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

const CategoryFilter = ({ selectedCategory, onCategoryChange, refreshTrigger }: CategoryFilterProps) => {
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Static category definitions with icons and colors
  const categoryDefinitions = [
    { id: "all", label: "All Emails", icon: Mail, color: "text-blue-600" },
    { id: "meetings", label: "Meetings", icon: Calendar, color: "text-green-600" },
    { id: "delivery", label: "Delivery", icon: Package, color: "text-orange-600" },
    { id: "interviews", label: "Interviews", icon: Briefcase, color: "text-purple-600" },
    { id: "other", label: "Other", icon: Mail, color: "text-gray-600" }
  ];

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        setLoading(true);
        
        // Fetch total emails count
        const emailsResponse = await authService.makeAuthenticatedRequest(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/emails/stats`
        );
        
        if (emailsResponse.ok) {
          const emailStats = await emailsResponse.json();
          
          // Fetch category-specific counts
          const categoriesResponse = await authService.makeAuthenticatedRequest(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/emails/categories`
          );
          
          if (categoriesResponse.ok) {
            const categoryData = await categoriesResponse.json();
            
            // Create a map for easy lookup
            const countMap = new Map(categoryData.map((item: CategoryCount) => [item.category || 'other', item.count]));
            
            // Build the complete category list with counts
            const counts = [
              { category: 'all', count: emailStats.totalEmails || 0 },
              { category: 'meetings', count: countMap.get('meetings') || 0 },
              { category: 'delivery', count: countMap.get('delivery') || 0 },
              { category: 'interviews', count: countMap.get('interviews') || 0 },
              { category: 'other', count: countMap.get('other') || 0 }
            ];
            
            setCategoryCounts(counts);
            logger.email('Category counts updated', { counts });
          }
        }
      } catch (error) {
        logger.error('Error fetching category counts', { error });
        // Set default empty counts on error
        setCategoryCounts([
          { category: 'all', count: 0 },
          { category: 'meetings', count: 0 },
          { category: 'delivery', count: 0 },
          { category: 'interviews', count: 0 },
          { category: 'other', count: 0 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (authService.isAuthenticated()) {
      fetchCategoryCounts();
    }
  }, [refreshTrigger]);

  // Merge category definitions with counts
  const categories = categoryDefinitions.map(def => {
    const countData = categoryCounts.find(c => c.category === def.id);
    return {
      ...def,
      count: countData?.count || 0
    };
  });

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
      <div className="space-y-1">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => onCategoryChange(category.id)}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : category.color}`} />
                <span className="text-sm font-medium">{category.label}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                isActive 
                  ? 'bg-blue-200 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {category.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
