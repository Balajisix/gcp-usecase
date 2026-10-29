import { CATEGORY_STYLES } from "../../constants/expense";

type CategoryBadgeProps = {
  category: string;
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const style =
    CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {category}
    </span>
  );
}
