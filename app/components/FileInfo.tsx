"use client";

import { useState } from 'react';
import { FileItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface FileInfoProps {
  file: FileItem | null;
}

export function FileInfo({ file }: FileInfoProps) {
  const [editedFile, setEditedFile] = useState<FileItem | null>(file);

  if (!file || !file.metadata) {
    return (
      <div className="h-full">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Select a file to view its configuration</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown';
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return 'Unknown';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  const calculateTotalCost = () => {
    if (!file.metadata.pricing) return 0;
    const { materialCost = 0, processingCost = 0, setupCost = 0 } = file.metadata.pricing;
    return materialCost + processingCost + setupCost;
  };

  const calculateUnitCost = () => {
    if (!file.metadata.pricing) return 0;
    const total = calculateTotalCost();
    const quantity = file.metadata.pricing.quantity || 1;
    return total / quantity;
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Pricing on top, File Info on bottom */}
      <div className="w-1/4 border-r">
        <Card className="h-full flex flex-col rounded-none border-0">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-4">
              {/* Pricing Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">Pricing</div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Unit Cost</div>
                        <div className="text-4xl font-bold">${calculateUnitCost()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total Cost</div>
                        <div className="text-xs font-medium">${calculateTotalCost()}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Quantity</Label>
                    <Input
                      type="number"
                      value={file.metadata.pricing?.quantity || 1}
                      onChange={(e) => {
                        if (!editedFile?.metadata.pricing) return;
                        setEditedFile({
                          ...editedFile,
                          metadata: {
                            ...editedFile.metadata,
                            pricing: {
                              ...editedFile.metadata.pricing,
                              quantity: parseInt(e.target.value)
                            }
                          }
                        });
                      }}
                      className="w-20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Material Cost</span>
                    <span className="font-medium">${file.metadata.pricing?.materialCost || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Processing Cost</span>
                    <span className="font-medium">${file.metadata.pricing?.processingCost || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Setup Cost</span>
                    <span className="font-medium">${file.metadata.pricing?.setupCost || 0}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* File Information Section in Two Lines */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-medium truncate">{file.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="font-medium">{file.type.toUpperCase()}</div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Size</div>
                    <div className="font-medium">{formatFileSize(file.metadata.size)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Modified</div>
                    <div className="font-medium">{formatDate(file.metadata.lastModified)}</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Right Panel - Manufacturing & Quality */}
      <div className="w-3/4">
        <Card className="h-full flex flex-col rounded-none border-0">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Manufacturing Configuration</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <Tabs defaultValue="manufacturing" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-6">
                    <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
                    <TabsTrigger value="quality">Quality</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manufacturing" className="space-y-8 mt-0">
                    {/* Manufacturing content */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Materials</Label>
                          <Button variant="outline" size="sm" onClick={() => {}}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Material
                          </Button>
                        </div>
                        {/* Materials list */}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Processes</Label>
                          <Button variant="outline" size="sm" onClick={() => {}}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Process
                          </Button>
                        </div>
                        {/* Processes list */}
                      </div>

                      <div className="space-y-4">
                        <Label>Specifications</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Dimensions inputs */}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="quality" className="space-y-8 mt-0">
                    {/* Quality content */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label>Requirements</Label>
                        <div className="space-y-4">
                          {/* Quality requirements */}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>
          <div className="p-4 border-t mt-auto">
            <Button className="w-full" onClick={() => console.log('Save changes:', editedFile)}>
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
