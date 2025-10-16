import { useState, useEffect } from "react";
import { Button } from "@/components/button/Button";
import { cn } from "@/lib/utils";

// Icons - using existing Phosphor icons from the project
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface Plant {
  id: string;
  name: string;
  type: string;
  location?: string;
  light_requirement?: string;
  water_frequency_days: number;
  last_watered?: string;
  notes?: string;
  created_at: string;
}

interface Schedule {
  id: string;
  description: string;
  executionTime: string;
}

interface PlantBookProps {
  agentId: string;
  refreshTrigger?: number; // Change this to trigger refresh
}

export default function PlantBook({ agentId, refreshTrigger }: PlantBookProps) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch plants and schedules
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch plants
      const plantsResponse = await fetch(`/api/plants?agentId=${agentId}`);
      if (plantsResponse.ok) {
        const plantsData = (await plantsResponse.json()) as { plants: Plant[] };
        setPlants(plantsData.plants || []);
      }

      // Fetch schedules
      const schedulesResponse = await fetch(`/api/schedules?agentId=${agentId}`);
      if (schedulesResponse.ok) {
        const schedulesData = (await schedulesResponse.json()) as { schedules: Schedule[] };
        setSchedules(schedulesData.schedules || []);
      }
    } catch (error) {
      console.error("Error fetching plant data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [agentId]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchData();
    }
  }, [refreshTrigger]);

  const pages = [
    { type: "cover" as const },
    ...plants.map((plant) => ({ type: "plant" as const, plant })),
  ];

  const nextPage = () => {
    if (currentPage < pages.length - 1 && !isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setIsFlipping(false);
      }, 600);
    }
  };

  const prevPage = () => {
    if (currentPage > 0 && !isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        setIsFlipping(false);
      }, 600);
    }
  };

  const currentPageData = pages[currentPage];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getPlantSchedules = (plantId: string) => {
    return schedules.filter((s) =>
      s.description.toLowerCase().includes(plantId.toLowerCase())
    );
  };

  return (
    <div className="relative perspective-[2000px]">
      {/* Book Spine (Left Edge) */}
      <div
        className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-green-900 via-green-800 to-green-700 rounded-l-lg shadow-xl z-10"
        style={{
          boxShadow:
            "inset -2px 0 8px rgba(0, 0, 0, 0.5), inset 2px 0 4px rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Spine texture lines */}
        <div className="absolute inset-0 flex flex-col justify-evenly px-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-px bg-green-600/50" />
          ))}
        </div>
      </div>

      {/* Book Container with 3D effect */}
      <div
        className={cn(
          "relative w-[90vw] max-w-2xl aspect-[3/4] bg-gradient-to-br from-amber-50 to-amber-100 dark:from-neutral-800 dark:to-neutral-900 rounded-r-lg overflow-hidden transition-transform duration-600 ml-8",
          isFlipping && "scale-[0.98]"
        )}
        style={{
          boxShadow: `
            0 25px 50px rgba(0, 0, 0, 0.4),
            0 10px 20px rgba(0, 0, 0, 0.3),
            inset 0 0 0 1px rgba(255, 255, 255, 0.5),
            inset -3px 0 8px rgba(0, 0, 0, 0.15)
          `,
        }}
      >
        {/* Page edges effect (right side) */}
        <div className="absolute right-0 top-0 bottom-0 w-2 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute right-0 h-full bg-white border-r border-slate-300"
              style={{
                width: `${2 - i * 0.2}px`,
                right: `${i * 0.5}px`,
                opacity: 0.8 - i * 0.1,
              }}
            />
          ))}
        </div>

        {/* Page Content with Flip Animation */}
        <div
          className={cn(
            "absolute inset-0 transition-all duration-600 ease-in-out",
            isFlipping && "opacity-0 scale-95"
          )}
        >
          {currentPageData.type === "cover" ? (
            <div className="flex flex-col items-center justify-center h-full p-8 md:p-12 bg-gradient-to-br from-green-800 via-green-900 to-green-950 text-white relative overflow-hidden">
              {/* Decorative border */}
              <div className="absolute inset-6 border-2 border-green-600/40 rounded-sm" />
              <div className="absolute inset-8 border border-green-700/30 rounded-sm" />

              <div className="text-center space-y-6 relative z-10">
                <h1
                  className="text-4xl md:text-6xl font-bold text-balance leading-tight drop-shadow-lg"
                  style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)" }}
                >
                  My Plant Collection
                </h1>
                <p className="text-xl md:text-2xl text-green-200 text-balance">
                  A Garden of Care & Growth
                </p>
                <div className="pt-8 space-y-2">
                  <p className="text-base md:text-lg text-slate-300">
                    {plants.length} {plants.length === 1 ? "Plant" : "Plants"} Tracked
                  </p>
                  {isLoading && (
                    <p className="text-sm text-slate-400">Loading...</p>
                  )}
                </div>
              </div>
            </div>
          ) : currentPageData.type === "plant" ? (
            <div className="flex flex-col h-full p-6 md:p-10 overflow-y-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-balance">
                {currentPageData.plant.name}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 italic">
                {currentPageData.plant.type}
              </p>

              <div className="space-y-4 text-sm md:text-base">
                {currentPageData.plant.location && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Location:
                    </span>{" "}
                    <span className="text-slate-600 dark:text-slate-300">
                      {currentPageData.plant.location}
                    </span>
                  </div>
                )}

                {currentPageData.plant.light_requirement && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Light:
                    </span>{" "}
                    <span className="text-slate-600 dark:text-slate-300">
                      {currentPageData.plant.light_requirement}
                    </span>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Water Every:
                  </span>{" "}
                  <span className="text-slate-600 dark:text-slate-300">
                    {currentPageData.plant.water_frequency_days} days
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Last Watered:
                  </span>{" "}
                  <span className="text-slate-600 dark:text-slate-300">
                    {formatDate(currentPageData.plant.last_watered)}
                  </span>
                </div>

                {currentPageData.plant.notes && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Notes:
                    </span>{" "}
                    <p className="text-slate-600 dark:text-slate-300 mt-1">
                      {currentPageData.plant.notes}
                    </p>
                  </div>
                )}

                {/* Scheduled Reminders */}
                <div className="pt-4 border-t border-slate-300 dark:border-slate-600">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Upcoming Reminders:
                  </span>
                  {getPlantSchedules(currentPageData.plant.id).length > 0 ? (
                    <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      {getPlantSchedules(currentPageData.plant.id).map((schedule) => (
                        <li key={schedule.id} className="text-sm">
                          • {schedule.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      No reminders scheduled
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage + 1} of {pages.length}
              </div>
            </div>
          ) : null}
        </div>

        {/* Navigation Buttons */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
          <Button
            onClick={prevPage}
            disabled={currentPage === 0 || isFlipping}
            variant="ghost"
            size="md"
            shape="square"
            className={cn(
              "pointer-events-auto rounded-full shadow-lg transition-all duration-300 hover:scale-110",
              currentPage === 0 && "opacity-0"
            )}
            aria-label="Previous page"
          >
            <CaretLeft size={20} />
          </Button>

          <Button
            onClick={nextPage}
            disabled={currentPage === pages.length - 1 || isFlipping}
            variant="ghost"
            size="md"
            shape="square"
            className={cn(
              "pointer-events-auto rounded-full shadow-lg transition-all duration-300 hover:scale-110",
              currentPage === pages.length - 1 && "opacity-0"
            )}
            aria-label="Next page"
          >
            <CaretRight size={20} />
          </Button>
        </div>

        {/* Page Progress Indicator */}
        <div className="absolute top-4 right-4 flex gap-1">
          {pages.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all duration-300",
                index === currentPage
                  ? "bg-slate-800 dark:bg-slate-200 w-6"
                  : "bg-slate-400/50 dark:bg-slate-500/50"
              )}
            />
          ))}
        </div>
      </div>

      {/* Book bottom shadow */}
      <div
        className="absolute bottom-0 left-4 right-0 h-4 bg-black/30 -z-10 blur-xl"
        style={{ transform: "translateY(100%)" }}
      />
    </div>
  );
}
