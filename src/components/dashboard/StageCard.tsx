
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface StageCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  color: string;
  description: string;
  onViewAll: () => void;
}

const StageCard = ({ title, count, icon: Icon, color, description, onViewAll }: StageCardProps) => {
  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      red: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getIconBg = (color: string) => {
    const backgrounds = {
      blue: 'bg-blue-100',
      green: 'bg-green-100',
      orange: 'bg-orange-100',
      purple: 'bg-purple-100',
      red: 'bg-red-100',
    };
    return backgrounds[color as keyof typeof backgrounds] || backgrounds.blue;
  };

  const getIconColor = (color: string) => {
    const textColors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      purple: 'text-purple-600',
      red: 'text-red-600',
    };
    return textColors[color as keyof typeof textColors] || textColors.blue;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${getIconBg(color)}`}>
          <Icon className={`h-4 w-4 ${getIconColor(color)}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{count}</div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <Badge 
            variant="outline" 
            className={getColorClasses(color)}
          >
            Active
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={onViewAll}
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
};

export default StageCard;
