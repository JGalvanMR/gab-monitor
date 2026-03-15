# GabMonitor.API/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["GabMonitor.API.csproj", "."]
RUN dotnet restore "./GabMonitor.API.csproj"
COPY . .
RUN dotnet build "GabMonitor.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "GabMonitor.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GabMonitor.API.dll"]
