# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file from BackEnd folder and restore dependencies
COPY BackEnd/*.csproj ./BackEnd/
RUN dotnet restore BackEnd/*.csproj

# Copy all source files and publish the backend
COPY . .
WORKDIR /src/BackEnd
RUN dotnet publish *.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Expose HTTP port for Render
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# FIX: Target backend.dll instead of JobDashboard.dll
ENTRYPOINT ["dotnet", "backend.dll"]
