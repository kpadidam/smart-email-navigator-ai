
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Package, Briefcase, Mail } from "lucide-react";

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const categories = [
    { id: "all", label: "All Emails", count: 47, icon: Mail, color: "text-blue-600" },
    { id: "meetings", label: "Meetings", count: 8, icon: Calendar, color: "text-green-600" },
    { id: "delivery", label: "Delivery", count: 5, icon: Package, color: "text-orange-600" },
    { id: "interviews", label: "Interviews", count: 3, icon: Briefcase, color: "text-purple-600" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              className="w-full justify-start h-auto p-3"
              onClick={() => onCategoryChange(category.id)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${category.color}`} />
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {category.count}
                </span>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default CategoryFilter;
