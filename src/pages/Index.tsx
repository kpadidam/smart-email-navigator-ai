
import Header from "../components/Header";
import StatsCards from "../components/StatsCards";
import CategoryFilter from "../components/CategoryFilter";
import SearchBar from "../components/SearchBar";
import EmailList from "../components/EmailList";
import { useState } from "react";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Email Tracker</h1>
          <p className="text-gray-600">AI-powered email categorization and tracking</p>
        </div>
        
        <StatsCards />
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <CategoryFilter 
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
          
          <div className="lg:col-span-3">
            <div className="mb-6">
              <SearchBar 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
            
            <EmailList 
              selectedCategory={selectedCategory}
              searchTerm={searchTerm}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
